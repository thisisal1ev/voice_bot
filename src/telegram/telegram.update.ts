import { On, Start, Update } from '@grammyjs/nestjs'
import { Injectable } from '@nestjs/common'
import { Context } from 'grammy'

import { TelegramService } from './telegram.service'

@Update()
@Injectable()
export class TelegramUpdate {
	constructor(private readonly telegramService: TelegramService) {}

	@Start()
	async onStart(ctx: Context): Promise<void> {
		await ctx.reply(
			'Привет! Отправь мне голосовое сообщение, и я расставлю тайм-коды.'
		)
	}

	@On('message:voice')
	async onVoiceMessage(ctx: Context): Promise<void> {
		return this.telegramService.processVoiceMessage(ctx)
	}
}
