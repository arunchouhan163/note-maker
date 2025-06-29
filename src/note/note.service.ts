import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Note } from './note.model';

@Injectable()
export class NoteService {
  constructor(@InjectModel(Note.name) private noteModel: Model<Note>) {}

  async create(noteDto: Partial<Note>): Promise<Note> {
    const created = new this.noteModel(noteDto);
    return created.save();
  }

  async findAll(): Promise<Note[]> {
    return this.noteModel.find({ isTrashed: false }).sort({ updatedAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Note> {
    const note = await this.noteModel.findById(id).exec();
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  async update(id: string, noteDto: Partial<Note>): Promise<Note> {
    const note = await this.noteModel.findByIdAndUpdate(id, noteDto, { new: true }).exec();
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  async delete(id: string): Promise<Note> {
    // Soft delete - mark as trashed
    const note = await this.noteModel.findByIdAndUpdate(
      id, 
      { isTrashed: true, trashedAt: new Date() }, 
      { new: true }
    ).exec();
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  async getArchivedNotes(): Promise<Note[]> {
    return this.noteModel.find({ isArchived: true, isTrashed: false }).sort({ updatedAt: -1 }).exec();
  }

  async getTrashedNotes(): Promise<Note[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return this.noteModel.find({
      isTrashed: true,
      trashedAt: { $gte: thirtyDaysAgo }
    }).sort({ trashedAt: -1 }).exec();
  }

  async searchNotes(query: string): Promise<Note[]> {
    return this.noteModel.find({
      isTrashed: false,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ]
    }).sort({ updatedAt: -1 }).exec();
  }

  async getNotesByTag(tag: string): Promise<Note[]> {
    return this.noteModel.find({
      isTrashed: false,
      tags: { $in: [tag] }
    }).sort({ updatedAt: -1 }).exec();
  }

  async getAllTags(): Promise<string[]> {
    const notes = await this.noteModel.find({ isTrashed: false }).select('tags').exec();
    const allTags = notes.flatMap(note => note.tags);
    return [...new Set(allTags)]; // Remove duplicates
  }

  async permanentlyDelete(id: string): Promise<void> {
    const result = await this.noteModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Note not found');
  }

  async restoreFromTrash(id: string): Promise<Note> {
    const note = await this.noteModel.findByIdAndUpdate(
      id,
      { isTrashed: false, trashedAt: undefined },
      { new: true }
    ).exec();
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }
} 