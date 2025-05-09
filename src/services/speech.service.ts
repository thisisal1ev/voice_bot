import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import * as FormData from 'form-data'

import { OPENAI_API, TELEGRAM_API } from '../constants'

@Injectable()
export class SpeechService {
	private readonly botToken: string
	private readonly openaiApiToken: string

	constructor(private readonly configService: ConfigService) {
		this.botToken = this.configService.get<string>('TG_BOT_TOKEN') ?? ''
		this.openaiApiToken = this.configService.get<string>('OPENAI_API_KEY') ?? ''
	}

	
	async transcribeVoice(filePath): Promise<string> {
		const fileUrl = `${TELEGRAM_API}/file/bot${this.botToken}/${filePath}`
		const fileResponse = await axios.get(fileUrl, {
			responseType: 'stream'
		})

		const formData = new FormData()
		formData.append('file', fileResponse.data, {
			filename: 'audio.ogg'
		})
		formData.append('model', 'whisper-1')
		const response = await axios.post<{ text: string }>(
			`${OPENAI_API}/audio/transcriptions`,
			formData,
			{
				headers: {
					Authorization: `Bearer ${this.openaiApiToken}`,
					...formData.getHeaders()
				}
			}
		)

		return response.data.text
	}
}
