import { InjectBot } from '@grammyjs/nestjs'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Bot, Context } from 'grammy'

import { SpeechService } from 'src/services/speech.service'

@Injectable()
export class TelegramService {
	private readonly botToken: string

	constructor(
		@InjectBot() private readonly bot: Bot<Context>,
		private readonly configService: ConfigService,
		private readonly speechService: SpeechService
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

			console.log(transcription)
		} catch (e) {
			clearInterval(interval)
			console.error('Ошибка при обработке голосового сообщение', e.message)
			await ctx.reply('⚠️ Ошибка при обработке голосового сообщение')
		}
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
