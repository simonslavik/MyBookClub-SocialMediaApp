import axios from 'axios';
import logger from '../utils/logger';
import { getRedisClient } from '../config/redis';
import { ValidationError, TooManyRequestsError, BadGatewayError, NotFoundError } from '../utils/errors';

function mapGoogleBooksError(error: any, context: 'search' | 'details'): Error {
  const status: number | undefined = error?.response?.status;

  // Network-level / timeout failures don't carry a response status — without
  // mapping them explicitly the caller bubbles the raw error up to express,
  // the request handler hangs/throws, and the origin eventually drops the
  // socket → Cloudflare returns a generic 502 with no CORS headers.
  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
    return new BadGatewayError(
      context === 'search'
        ? 'Book search is taking too long. Please try again.'
        : 'Book details request timed out. Please try again.',
    );
  }
  if (error?.code === 'ECONNRESET' || error?.code === 'ENOTFOUND' || error?.code === 'EAI_AGAIN') {
    return new BadGatewayError('Book service is temporarily unreachable. Please try again shortly.');
  }
  if (status === 400) {
    return new ValidationError(
      context === 'search'
        ? "Couldn't process that search query. Try simpler keywords without special characters or operators."
        : 'Invalid book identifier.',
    );
  }
  if (status === 404 && context === 'details') {
    return new NotFoundError('Book');
  }
  if (status === 429) {
    return new TooManyRequestsError('Too many book searches right now — please try again in a moment.');
  }
  if (status && status >= 500) {
    return new BadGatewayError('Book search is temporarily unavailable. Please try again shortly.');
  }
  return new BadGatewayError(
    context === 'search' ? 'Failed to search books.' : 'Failed to fetch book details.',
  );
}

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';
const API_KEY = process.env.GOOGLE_BOOKS_API_KEY;
const CACHE_TTL = 60 * 60 * 24; // 24 hours in seconds
// Hard ceiling on every Google Books call — without this axios defaults to no
// timeout, a hung upstream blocks an event-loop slot indefinitely and the
// container eventually stops responding (Cloudflare then returns its own 502).
const GOOGLE_BOOKS_TIMEOUT_MS = 8_000;

interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    publishedDate?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    pageCount?: number;
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
  };
}

interface BookData {
  googleBooksId: string;
  title: string;
  author: string;
  coverUrl: string | null;
  description: string | null;
  pageCount: number | null;
  isbn: string | null;
  publishedDate: string | null;
}

export class GoogleBooksService {
  /**
   * Search books from Google Books API with Redis caching
   */
  static async searchBooks(query: string, maxResults: number = 20): Promise<BookData[]> {
    const redis = getRedisClient();
    const cacheKey = `books:search:${query}:${maxResults}`;

    try {
      // Try to get from cache first
      if (redis && redis.isOpen) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          logger.info('✅ Cache hit for book search:', { query });
          return JSON.parse(cached);
        }
        logger.info('❌ Cache miss for book search:', { query });
      }

      const params: any = {
        q: query,
        maxResults,
        printType: 'books',
        langRestrict: 'en',
        orderBy: 'relevance',
      };

      if (API_KEY) {
        params.key = API_KEY;
      }

      const response = await axios.get(GOOGLE_BOOKS_API, { params, timeout: GOOGLE_BOOKS_TIMEOUT_MS });

      const books =
        response.data.items?.map((item: GoogleBook) => ({
          googleBooksId: item.id,
          title: item.volumeInfo.title,
          author: item.volumeInfo.authors?.join(', ') || 'Unknown Author',
          coverUrl: item.volumeInfo.imageLinks?.thumbnail || null,
          description: item.volumeInfo.description || null,
          pageCount: item.volumeInfo.pageCount || null,
          isbn:
            item.volumeInfo.industryIdentifiers?.find(
              (id) => id.type === 'ISBN_13' || id.type === 'ISBN_10'
            )?.identifier || null,
          publishedDate: item.volumeInfo.publishedDate || null,
        })) || [];

      // Cache the results
      if (redis && redis.isOpen && books.length > 0) {
        await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(books));
        logger.info('💾 Cached book search results:', { query, count: books.length });
      }

      return books;
    } catch (error: any) {
      const status = error.response?.status;
      // Retry once on 503 (Service Unavailable) — Google Books transient error
      if (status === 503) {
        logger.warn('Google Books API returned 503, retrying in 1s...', { query });
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          const params2: any = { q: query, maxResults, printType: 'books', langRestrict: 'en', orderBy: 'relevance' };
          if (API_KEY) params2.key = API_KEY;
          const retryResponse = await axios.get(GOOGLE_BOOKS_API, { params: params2, timeout: GOOGLE_BOOKS_TIMEOUT_MS });
          const retryBooks = retryResponse.data.items?.map((item: GoogleBook) => ({
            googleBooksId: item.id,
            title: item.volumeInfo.title,
            author: item.volumeInfo.authors?.join(', ') || 'Unknown Author',
            coverUrl: item.volumeInfo.imageLinks?.thumbnail || null,
            description: item.volumeInfo.description || null,
            pageCount: item.volumeInfo.pageCount || null,
            isbn: item.volumeInfo.industryIdentifiers?.find(
              (id) => id.type === 'ISBN_13' || id.type === 'ISBN_10'
            )?.identifier || null,
            publishedDate: item.volumeInfo.publishedDate || null,
          })) || [];
          if (redis && redis.isOpen && retryBooks.length > 0) {
            await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(retryBooks));
          }
          return retryBooks;
        } catch (retryError: any) {
          logger.error('Google Books API retry also failed:', { error: retryError.message, query });
        }
      }
      logger.error('Google Books API search error:', { error: error.message, code: error.code, status, query });
      throw mapGoogleBooksError(error, 'search');
    }
  }

  /**
   * Get book details by Google Books ID with Redis caching
   */
  static async getBookById(googleBooksId: string): Promise<BookData> {
    const redis = getRedisClient();
    const cacheKey = `books:details:${googleBooksId}`;

    try {
      // Try to get from cache first
      if (redis && redis.isOpen) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          logger.info('✅ Cache hit for book details:', { googleBooksId });
          return JSON.parse(cached);
        }
        logger.info('❌ Cache miss for book details:', { googleBooksId });
      }

      const params: any = {};
      if (API_KEY) params.key = API_KEY;

      const response = await axios.get(`${GOOGLE_BOOKS_API}/${googleBooksId}`, { params, timeout: GOOGLE_BOOKS_TIMEOUT_MS });
      const book = response.data;

      const bookData = {
        googleBooksId: book.id,
        title: book.volumeInfo.title,
        author: book.volumeInfo.authors?.join(', ') || 'Unknown Author',
        coverUrl: book.volumeInfo.imageLinks?.thumbnail || null,
        description: book.volumeInfo.description || null,
        pageCount: book.volumeInfo.pageCount || null,
        isbn:
          book.volumeInfo.industryIdentifiers?.find(
            (id: any) => id.type === 'ISBN_13' || id.type === 'ISBN_10'
          )?.identifier || null,
        publishedDate: book.volumeInfo.publishedDate || null,
      };

      // Cache the result
      if (redis && redis.isOpen) {
        await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(bookData));
        logger.info('💾 Cached book details:', { googleBooksId });
      }

      return bookData;
    } catch (error: any) {
      const status = error.response?.status;
      logger.error('Google Books API get book error:', { error: error.message, code: error.code, status, googleBooksId });
      throw mapGoogleBooksError(error, 'details');
    }
  }
}
