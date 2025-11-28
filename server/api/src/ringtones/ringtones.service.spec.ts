import { Test, TestingModule } from '@nestjs/testing';
import { RingtonesService } from './ringtones.service';

describe('RingtonesService', () => {
  let service: RingtonesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RingtonesService],
    }).compile();

    service = module.get<RingtonesService>(RingtonesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
