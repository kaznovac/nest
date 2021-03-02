import {
  INestApplication,
  CallHandler,
  ExecutionContext,
  NestInterceptor,
  ArgumentMetadata,
  PipeTransform,
} from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';
import { Observable } from 'rxjs';
import { ApplicationModule } from '../src/app.module';

class SpyInterceptor implements NestInterceptor {
  called = false;

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> | Promise<Observable<any>> {
    this.called = true;

    return next.handle();
  }
}

class SpyPipe implements PipeTransform {
  called = false;

  transform(value: any, metadata: ArgumentMetadata): any {
    this.called = true;

    return value;
  }
}

describe('Global Config is applied', () => {
  let server;
  let app: INestApplication;
  let interceptor: SpyInterceptor;
  let pipe: SpyPipe;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ApplicationModule],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpAdapter().getInstance();

    const microservice = app.connectMicroservice({
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
      },
    });

    interceptor = new SpyInterceptor();
    microservice.useGlobalInterceptors(interceptor);

    pipe = new SpyPipe();
    microservice.useGlobalPipes(pipe);

    await app.startAllMicroservicesAsync();
    await app.init();
  });

  it(`Interceptor called`, async () => {
    await request(server)
      .post('/?command=sum')
      .send([1, 2, 3, 4, 5])
    ;

    expect(interceptor.called).to.be.true;
  });

  it(`Pipe called`, async () => {
    await request(server)
      .post('/?command=sum')
      .send([1, 2, 3, 4, 5])
    ;

    expect(pipe.called).to.be.true;
  });

  afterEach(async () => {
    await app.close();
  });
});
