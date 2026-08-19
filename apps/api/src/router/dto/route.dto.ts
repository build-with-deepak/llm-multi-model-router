import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RouteRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000, {
    message: 'Prompt is too long — keep it under 2000 characters.',
  })
  prompt!: string;

  @IsIn(['fast', 'balanced', 'quality'])
  latencyBudget!: 'fast' | 'balanced' | 'quality';
}
