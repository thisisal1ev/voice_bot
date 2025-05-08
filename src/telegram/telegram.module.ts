import { NestjsGrammyModule } from '@grammyjs/nestjs'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'

import { TelegramService } from './telegram.service'
import { TelegramUpdate } from './telegram.update'

@Module({
	imports: [
		ConfigModule,
		NestjsGrammyModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: async (configService: ConfigService) => ({
				token: configService.get<string>('TG_BOT_TOKEN') ?? ''
			})
		})
	],
	providers: [TelegramUpdate, TelegramService]
})
export class TelegramModule {}
