import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { TelegramModule } from './telegram/telegram.module'

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true
		}),
		TelegramModule
	]
})
export class AppModule {}
