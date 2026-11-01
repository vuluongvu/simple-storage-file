import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // enable global validate pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove unallowed fields
      forbidNonWhitelisted: true, // wrong field -> return 400
      transform: true, // convert types
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // set global prefix to /api as required by specification
  app.setGlobalPrefix('api');

  // enable shutdown hooks for graceful shutdown
  app.enableShutdownHooks();

  // use helmet for security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:4200'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // use global interceptor for class serialization
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // setup swagger documentation at /api/docs
  const config = new DocumentBuilder()
    .setTitle('Simple File Storage API')
    .setDescription(
      'Backend REST API for Simple File Storage with JWT auth, file management, access control, and sharing',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT Bearer token',
        in: 'header',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on port ${port}`);
}

await bootstrap();
