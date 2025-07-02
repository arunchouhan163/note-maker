import { Controller, Get, Post, Put, Delete, Body, Param, Query, Logger, UseGuards, Request } from '@nestjs/common';
import { NoteService } from './note.service';
import { Note } from './note.model';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CleanupService } from '../tasks/cleanup.service';

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NoteController {
  private readonly logger = new Logger(NoteController.name);

  constructor(
    private readonly noteService: NoteService,
    private readonly cleanupService: CleanupService,
  ) {}

  @Post()
  async create(@Body() noteDto: Partial<Note>, @Request() req: any) {
    this.logger.log(`Creating note with DTO: ${JSON.stringify(noteDto)}`);
    const result = await this.noteService.create(noteDto, req.user.userId);
    this.logger.log(`Note created successfully with ID: ${(result as any)._id}`);
    return result;
  }

  @Get()
  async findAll(@Request() req: any) {
    this.logger.log('Fetching all notes');
    return this.noteService.findAll(req.user.userId);
  }

  @Get('search')
  async search(@Query('q') query: string, @Request() req: any) {
    this.logger.log(`Searching notes with query: ${query}`);
    return this.noteService.searchNotes(query, req.user.userId);
  }

  @Get('archived')
  async getArchivedNotes(@Request() req: any) {
    this.logger.log('Fetching archived notes');
    return this.noteService.getArchivedNotes(req.user.userId);
  }

  @Get('trash')
  async getTrashedNotes(@Request() req: any) {
    this.logger.log('Fetching trashed notes');
    return this.noteService.getTrashedNotes(req.user.userId);
  }

  @Get('tags')
  async getAllTags(@Request() req: any) {
    this.logger.log('Fetching all tags');
    return this.noteService.getAllTags(req.user.userId);
  }

  @Get('tags/:tag')
  async getNotesByTag(@Param('tag') tag: string, @Request() req: any) {
    this.logger.log(`Fetching notes by tag: ${tag}`);
    return this.noteService.getNotesByTag(tag, req.user.userId);
  }

  @Get('due-dates')
  async getDueDateNotes(@Request() req: any) {
    this.logger.log('Fetching overdue and upcoming notes');
    return this.noteService.getDueDateNotes(req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    this.logger.log(`Fetching note with ID: ${id}`);
    return this.noteService.findOne(id, req.user.userId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() noteDto: Partial<Note>, @Request() req: any) {
    this.logger.log(`Updating note with ID: ${id}, DTO: ${JSON.stringify(noteDto)}`);
    return this.noteService.update(id, noteDto, req.user.userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: any) {
    this.logger.log(`Deleting note with ID: ${id}`);
    return this.noteService.delete(id, req.user.userId);
  }

  @Delete(':id/permanent')
  async permanentlyDelete(@Param('id') id: string, @Request() req: any) {
    this.logger.log(`Permanently deleting note with ID: ${id}`);
    return this.noteService.permanentlyDelete(id, req.user.userId);
  }

  @Put(':id/restore')
  async restoreFromTrash(@Param('id') id: string, @Request() req: any) {
    this.logger.log(`Restoring note from trash with ID: ${id}`);
    return this.noteService.restoreFromTrash(id, req.user.userId);
  }

  @Get('trash/stats')
  async getTrashStats() {
    this.logger.log('Getting trash statistics');
    return this.noteService.getTrashStats();
  }

  @Post('trash/cleanup')
  async manualTrashCleanup() {
    this.logger.log('Manual trash cleanup requested');
    return this.cleanupService.manualCleanup();
  }
} 