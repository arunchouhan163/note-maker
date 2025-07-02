import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NoteService } from '../note/note.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly noteService: NoteService) {}

  // Run daily at 2:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleTrashedNotesCleanup() {
    this.logger.log('🕐 Starting daily trash cleanup job...');
    
    try {
      const startTime = Date.now();
      
      // Get stats before cleanup
      const statsBefore = await this.noteService.getTrashStats();
      this.logger.log(`📊 Trash stats before cleanup: ${JSON.stringify(statsBefore)}`);
      
      // Perform cleanup
      const result = await this.noteService.cleanupOldTrashedNotes();
      
      // Get stats after cleanup
      const statsAfter = await this.noteService.getTrashStats();
      
      const duration = Date.now() - startTime;
      
      this.logger.log(`✅ Trash cleanup completed in ${duration}ms`);
      this.logger.log(`🗑️  Deleted ${result.deletedCount} old notes`);
      this.logger.log(`📊 Trash stats after cleanup: ${JSON.stringify(statsAfter)}`);
      
      // Log warning if there are still expired notes (shouldn't happen)
      if (statsAfter.expired > 0) {
        this.logger.warn(`⚠️  Warning: ${statsAfter.expired} expired notes still remain`);
      }
      
    } catch (error) {
      this.logger.error('❌ Failed to run trash cleanup job:', error);
    }
  }

  // Run every Sunday at 1:00 AM for weekly stats
  @Cron('0 1 * * 0')
  async handleWeeklyTrashReport() {
    this.logger.log('📊 Generating weekly trash report...');
    
    try {
      const stats = await this.noteService.getTrashStats();
      
      this.logger.log(`📈 Weekly Trash Report:`);
      this.logger.log(`   • Total trashed notes: ${stats.total}`);
      this.logger.log(`   • Notes in 30-day window: ${stats.upcoming}`);
      this.logger.log(`   • Expired notes (should be 0): ${stats.expired}`);
      
      if (stats.expired > 0) {
        this.logger.warn(`⚠️  Found ${stats.expired} expired notes that should have been cleaned up!`);
      }
      
    } catch (error) {
      this.logger.error('❌ Failed to generate weekly trash report:', error);
    }
  }

  // Manual cleanup method for testing or emergency use
  async manualCleanup(): Promise<{ deletedCount: number; stats: any }> {
    this.logger.log('🔧 Manual trash cleanup initiated...');
    
    const statsBefore = await this.noteService.getTrashStats();
    const result = await this.noteService.cleanupOldTrashedNotes();
    const statsAfter = await this.noteService.getTrashStats();
    
    return {
      deletedCount: result.deletedCount,
      stats: {
        before: statsBefore,
        after: statsAfter
      }
    };
  }
} 