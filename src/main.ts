import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './utils/global-exception.filter';
import * as mongoose from 'mongoose';

async function bootstrap() {
  // Ensure MongoDB connection for Typegoose models
  if (!mongoose.connection.readyState) {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/notemaker';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for Typegoose models');
  }

  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  // Set global prefix for API routes
  app.setGlobalPrefix('api');
  
  app.useGlobalPipes(new ValidationPipe({
    exceptionFactory: (errors) => {
      // Only return the first error object
      const error = errors[0];
      return error;
    },
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  
  const port = 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`API endpoints available at: http://localhost:${port}/api`);
}
bootstrap(); 