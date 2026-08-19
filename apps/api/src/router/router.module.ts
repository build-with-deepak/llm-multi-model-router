import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { ClassifyService } from './classify.service';
import { DecisionService } from './decision.service';
import {
  AnthropicProvider,
  GeminiProvider,
  OpenAiProvider,
} from './providers/cloud.providers';
import { OllamaProvider } from './providers/ollama.provider';
import { RouteController } from './route.controller';
import { RouteService } from './route.service';

@Module({
  imports: [DbModule],
  controllers: [RouteController],
  providers: [
    ClassifyService,
    DecisionService,
    RouteService,
    OllamaProvider,
    OpenAiProvider,
    AnthropicProvider,
    GeminiProvider,
  ],
  exports: [RouteService],
})
export class RouterModule {}
