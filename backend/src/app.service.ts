import { Injectable } from '@nestjs/common';

// Trivial root service paired with AppController for the smoke-test endpoint.
@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
