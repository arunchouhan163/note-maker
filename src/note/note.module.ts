import { Module } from '@nestjs/common';
import { NoteController } from './note.controller';
import { NoteService } from './note.service';
import { CleanupService } from '../tasks/cleanup.service';

@Module({
  controllers: [NoteController],
  providers: [NoteService, CleanupService],
  exports: [NoteService],
})
export class NoteModule {} 