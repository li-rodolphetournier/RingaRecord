import { Test, TestingModule } from '@nestjs/testing';
import { RingtonesController } from './ringtones.controller';

describe('RingtonesController', () => {
  let controller: RingtonesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RingtonesController],
    }).compile();

    controller = module.get<RingtonesController>(RingtonesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
