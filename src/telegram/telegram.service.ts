import { InjectBot } from '@grammyjs/nestjs'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Api, Bot, Context } from 'grammy'

import { AiService } from 'src/services/ai.service'
import { SpeechService } from 'src/services/speech.service'

@Injectable()
export class TelegramService {
	private readonly botToken: string

	constructor(
		@InjectBot() private readonly bot: Bot<Context>,
		private readonly configService: ConfigService,
		private readonly speechService: SpeechService,
		private readonly aiService: AiService
	) {
		this.botToken = this.configService.get<string>('TG_BOT_TOKEN') ?? ''
	}

	async processVoiceMessage(ctx: Context): Promise<void> {
		const voice = ctx.message?.voice
		const duration = voice?.duration

		let progressMessageId: number | undefined
		let interval: NodeJS.Timeout | undefined
		let percent = 10

		try {
			const file = await ctx.getFile()
			await ctx.reply(`🎙️ Длина голосового сообщения: ${duration} сек.`)

			const progressMsg = await ctx.reply(this.renderProgress(percent))
			progressMessageId = progressMsg.message_id

			interval = setTimeout(
				async () => {
					if (percent < 90) {
						percent += 5
						await ctx.api.editMessageText(
							ctx.chat?.id ?? 0,
							progressMessageId ?? 0,
							this.renderProgress(percent)
						)
					}
				},
				duration ? duration : 0 > 300 ? 3000 : 2000
			)

			const transcription = await this.speechService.transcribeVoice(
				file.file_path
			)

			const { cost, timestamps } = await this.aiService.generateTimestamps(
				transcription,
				duration ?? 0
			)

			clearInterval(interval)

			await this.updateProgress(
				ctx.api,
				ctx.chat?.id ?? 0,
				progressMessageId,
				100
			)
			await ctx.reply(`⌛ Тайм-коды: \n\n${timestamps}`)
			await ctx.reply(`💸 Стоимость: ${cost}`)
		} catch (e) {
			clearInterval(interval)
			console.error('Ошибка при обработке голосового сообщение', e.message)
			await ctx.reply('⚠️ Ошибка при обработке голосового сообщение')
		}
	}

	private async updateProgress(
		api: Api,
		chatId: number,
		messageId: number,
		percent: number
	) {
		await api.editMessageText(chatId, messageId, this.renderProgress(percent))
	}

	private renderProgress(percent: number): string {
		const totalBlocks = 10
		const filledBlockChar = '#'
		const emptyBlockChar = '-'

		const filledBlocks = Math.max(1, Math.round((percent / 100) * totalBlocks))
		const emptyBlock = totalBlocks - filledBlocks

		return `🔁 Прогресс: [${filledBlockChar.repeat(filledBlocks)}${emptyBlockChar.repeat(emptyBlock)}] ${percent}%`
	}
}
