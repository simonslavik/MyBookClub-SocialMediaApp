import { BookClubBooksRepository } from '../repositories/bookClubBooks.repository';
import { BooksRepository } from '../repositories/books.repository';
import { GoogleBooksService } from './googleBooks.service';
import { BookClubBookStatus } from '@prisma/client';
import { NotFoundError } from '../utils/errors';
import logger from '../utils/logger';

export class BookClubBooksService {
  /**
   * Get books for a bookclub (with pagination)
   */
  static async getBookClubBooks(
    bookClubId: string,
    status?: BookClubBookStatus,
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;
    const { data, total } = await BookClubBooksRepository.findByBookClubId(bookClubId, status, skip, limit);
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Add book to bookclub
   */
  static async addBookClubBook(
    bookClubId: string,
    userId: string,
    googleBooksId: string,
    status: BookClubBookStatus = BookClubBookStatus.upcoming,
    startDate?: Date,
    endDate?: Date
  ) {
    // Fetch book data from Google Books API
    const bookData = await GoogleBooksService.getBookById(googleBooksId);

    // Create or find book in database
    const book = await BooksRepository.upsert(googleBooksId, bookData);

    // Add to bookclub
    const bookClubBook = await BookClubBooksRepository.create({
      bookClubId,
      bookId: book.id,
      status,
      startDate: startDate || null,
      endDate: endDate || null,
      addedById: userId,
    });

    logger.info('Book added to bookclub:', { bookClubId, bookId: book.id, status });
    return bookClubBook;
  }

  /**
   * Update bookclub book
   */
  static async updateBookClubBook(
    bookClubId: string,
    bookId: string,
    data: { status?: BookClubBookStatus; startDate?: Date; endDate?: Date }
  ) {
    const existingBookClubBook = await BookClubBooksRepository.findOne(bookClubId, bookId);
    if (!existingBookClubBook) {
      throw new NotFoundError('Book in this bookclub');
    }

    const updatedData: any = {};
    if (data.status !== undefined) updatedData.status = data.status;
    if (data.startDate !== undefined) updatedData.startDate = data.startDate;
    if (data.endDate !== undefined) updatedData.endDate = data.endDate;

    // Validate date ordering
    const effectiveStart = updatedData.startDate ?? existingBookClubBook.startDate;
    const effectiveEnd = updatedData.endDate ?? existingBookClubBook.endDate;
    if (effectiveStart && effectiveEnd && new Date(effectiveEnd) <= new Date(effectiveStart)) {
      throw new Error('End date must be after start date');
    }

    const updatedBook = await BookClubBooksRepository.update(bookClubId, bookId, updatedData);
    logger.info('Bookclub book updated:', { bookClubId, bookId });
    return updatedBook;
  }

  /**
   * Delete book from bookclub
   */
  static async deleteBookClubBook(bookClubId: string, bookId: string) {
    const existingBookClubBook = await BookClubBooksRepository.findOne(bookClubId, bookId);
    if (!existingBookClubBook) {
      throw new NotFoundError('Book in this bookclub');
    }

    await BookClubBooksRepository.delete(bookClubId, bookId);
    logger.info('Bookclub book deleted:', { bookClubId, bookId });
  }

  /**
   * Get books to display per bookclub on cards (discover / home / sidebar).
   * Prefers `current` books; if a club has none, falls back to its `upcoming`
   * books so cards still show *something* the club is reading toward.
   *
   * The result key stays `currentBooks` to keep the existing client contract;
   * each entry still has a `status` field so the UI can label "Currently Reading"
   * vs "Up Next" appropriately.
   */
  static async getBatchCurrentBooks(bookClubIds: string[]) {
    const books = await BookClubBooksRepository.findCurrentOrUpcomingByBookClubIds(bookClubIds);

    return bookClubIds.map((bookClubId) => {
      const clubBooks = books.filter((b) => b.bookClubId === bookClubId);
      const current = clubBooks.filter((b) => b.status === 'current');
      const displayed = current.length > 0
        ? current
        : clubBooks.filter((b) => b.status === 'upcoming');
      return { bookClubId, currentBooks: displayed };
    });
  }
}
