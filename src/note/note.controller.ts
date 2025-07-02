import { Controller, Get, Post, Put, Delete, Body, Param, Query, Logger } from '@nestjs/common';
import { NoteService } from './note.service';
import { Note } from './note.model';

@Controller('notes')
export class NoteController {
  private readonly logger = new Logger(NoteController.name);

  constructor(private readonly noteService: NoteService) {}

  @Post()
  async create(@Body() noteDto: Partial<Note>) {
    this.logger.log(`Creating note with DTO: ${JSON.stringify(noteDto)}`);
    const result = await this.noteService.create(noteDto);
    this.logger.log(`Note created successfully with ID: ${(result as any)._id}`);
    return result;
  }

  @Get()
  async findAll() {
    this.logger.log('Fetching all notes');
    return this.noteService.findAll();
  }

  @Get('search')
  async search(@Query('q') query: string) {
    this.logger.log(`Searching notes with query: ${query}`);
    return this.noteService.searchNotes(query);
  }

  @Get('archived')
  async getArchivedNotes() {
    this.logger.log('Fetching archived notes');
    return this.noteService.getArchivedNotes();
  }

  @Get('trash')
  async getTrashedNotes() {
    this.logger.log('Fetching trashed notes');
    return this.noteService.getTrashedNotes();
  }

  @Get('tags')
  async getAllTags() {
    this.logger.log('Fetching all tags');
    return this.noteService.getAllTags();
  }

  @Get('tags/:tag')
  async getNotesByTag(@Param('tag') tag: string) {
    this.logger.log(`Fetching notes by tag: ${tag}`);
    return this.noteService.getNotesByTag(tag);
  }

  @Get('due-dates')
  async getDueDateNotes() {
    this.logger.log('Fetching overdue and upcoming notes');
    return this.noteService.getDueDateNotes();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.log(`Fetching note with ID: ${id}`);
    return this.noteService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() noteDto: Partial<Note>) {
    this.logger.log(`Updating note with ID: ${id}, DTO: ${JSON.stringify(noteDto)}`);
    return this.noteService.update(id, noteDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    this.logger.log(`Deleting note with ID: ${id}`);
    return this.noteService.delete(id);
  }

  @Delete(':id/permanent')
  async permanentlyDelete(@Param('id') id: string) {
    this.logger.log(`Permanently deleting note with ID: ${id}`);
    return this.noteService.permanentlyDelete(id);
  }

  @Put(':id/restore')
  async restoreFromTrash(@Param('id') id: string) {
    this.logger.log(`Restoring note from trash with ID: ${id}`);
    return this.noteService.restoreFromTrash(id);
  }
} 