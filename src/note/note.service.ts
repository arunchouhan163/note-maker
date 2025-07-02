import { Injectable, NotFoundException } from '@nestjs/common';
import { NoteModel, Note } from './note.model';

@Injectable()
export class NoteService {

  async create(noteDto: Partial<Note>, userId: string): Promise<Note> {
    const created = new NoteModel({ ...noteDto, userId });
    return created.save();
  }

  async findAll(userId: string): Promise<Note[]> {
    return NoteModel.find({ userId, isTrashed: false }).sort({ updatedAt: -1 }).exec();
  }

  async findOne(id: string, userId: string): Promise<Note> {
    const note = await NoteModel.findOne({ _id: id, userId }).exec();
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  async update(id: string, noteDto: Partial<Note>, userId: string): Promise<Note> {
    const note = await NoteModel.findOneAndUpdate(
      { _id: id, userId }, 
      noteDto, 
      { new: true }
    ).exec();
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  async delete(id: string, userId: string): Promise<Note> {
    // Soft delete - mark as trashed
    const note = await NoteModel.findOneAndUpdate(
      { _id: id, userId }, 
      { isTrashed: true, trashedAt: new Date() }, 
      { new: true }
    ).exec();
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  async getArchivedNotes(userId: string): Promise<Note[]> {
    return NoteModel.find({ userId, isArchived: true, isTrashed: false }).sort({ updatedAt: -1 }).exec();
  }

  async getTrashedNotes(userId: string): Promise<Note[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return NoteModel.find({
      userId,
      isTrashed: true,
      trashedAt: { $gte: thirtyDaysAgo }
    }).sort({ trashedAt: -1 }).exec();
  }

  async cleanupOldTrashedNotes(): Promise<{ deletedCount: number }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    console.log(`🗑️  Cleaning up notes trashed before: ${thirtyDaysAgo.toISOString()}`);
    
    const result = await NoteModel.deleteMany({
      isTrashed: true,
      trashedAt: { $lt: thirtyDaysAgo }
    }).exec();
    
    console.log(`🗑️  Permanently deleted ${result.deletedCount} old trashed notes`);
    
    return { deletedCount: result.deletedCount };
  }

  async getTrashStats(): Promise<{ total: number; upcoming: number; expired: number }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [total, recent, expired] = await Promise.all([
      NoteModel.countDocuments({ isTrashed: true }),
      NoteModel.countDocuments({ 
        isTrashed: true, 
        trashedAt: { $gte: thirtyDaysAgo }
      }),
      NoteModel.countDocuments({ 
        isTrashed: true, 
        trashedAt: { $lt: thirtyDaysAgo }
      })
    ]);
    
    return {
      total,
      upcoming: recent,
      expired
    };
  }

  async searchNotes(query: string, userId: string): Promise<Note[]> {
    return NoteModel.find({
      userId,
      isTrashed: false,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { items: { $elemMatch: { $regex: query, $options: 'i' } } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ]
    }).sort({ updatedAt: -1 }).exec();
  }

  async getNotesByTag(tag: string, userId: string): Promise<Note[]> {
    return NoteModel.find({
      userId,
      isTrashed: false,
      tags: { $in: [tag] }
    }).sort({ updatedAt: -1 }).exec();
  }

  async getAllTags(userId: string): Promise<string[]> {
    const notes = await NoteModel.find({ userId, isTrashed: false }).select('tags').exec();
    const allTags = notes.flatMap((note: any) => note.tags);
    return [...new Set(allTags)]; // Remove duplicates
  }

  async permanentlyDelete(id: string, userId: string): Promise<void> {
    const result = await NoteModel.findOneAndDelete({ _id: id, userId }).exec();
    if (!result) throw new NotFoundException('Note not found');
  }

  async restoreFromTrash(id: string, userId: string): Promise<Note> {
    const note = await NoteModel.findOneAndUpdate(
      { _id: id, userId },
      { isTrashed: false, trashedAt: undefined },
      { new: true }
    ).exec();
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  async getDueDateNotes(userId: string): Promise<{ overdue: Note[], upcoming: Note[] }> {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const [overdue, upcoming] = await Promise.all([
      NoteModel.find({
        userId,
        isTrashed: false,
        dueDate: { $lt: now }
      }).sort({ dueDate: 1 }).exec(),
      
      NoteModel.find({
        userId,
        isTrashed: false,
        dueDate: { $gte: now, $lte: nextWeek }
      }).sort({ dueDate: 1 }).exec()
    ]);

    return { overdue, upcoming };
  }
} 