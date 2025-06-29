import { Controller, Get, Res, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { join } from 'path';

@Controller()
export class AppController {
  @Get('*')
  serveApp(@Req() req: Request, @Res() res: Response) {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({
        statusCode: 404,
        message: 'API endpoint not found',
      });
    }
    
    res.sendFile(join(__dirname, '..', 'public', 'index.html'));
  }
} 