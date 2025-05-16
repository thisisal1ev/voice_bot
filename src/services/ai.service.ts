import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import { OPENAI_API } from 'src/constants'

import {
	buildTimestampUserPrompt,
	TIMESTAMP_SYSTEM_PROMPT
} from 'src/prompts/timestamp.prompts'

@Injectable()
export class AiService {
	private readonly openAiApiKey: string

	constructor(private readonly configService: ConfigService) {
		this.openAiApiKey = this.configService.get<string>('OPENAI_API_KEY') ?? ''
	}

	async generateTimestamps(
		text: string,
		audioDurationSec: number
	): Promise<{
		timestamps: string
		cost: string
	}> {
		const maxSegments = 10
		const words = text.split(/\s+/)

		const wordsPerSegment = Math.ceil(words.length / maxSegments)
		const secondsPerSegment = Math.floor(audioDurationSec / maxSegments)

		const segments: { time: string; content: string }[] = []

		for (let i = 0; i < maxSegments; i++) {
			const fromSec = i * secondsPerSegment
			const fromMin = String(Math.floor(fromSec / 60)).padStart(2, '0')
			const fromSecRest = String(fromSec % 60).padStart(2, '0')
			const time = `${fromMin}:${fromSecRest}`

			const start = i * wordsPerSegment
			const end = start * wordsPerSegment
			const content = words.slice(start, end).join(' ')

			if (content.trim()) {
				segments.push({ time, content })
			}
		}

		const preparedText = segments.map(({ content }) => content).join('\n')

		const systemMessage = TIMESTAMP_SYSTEM_PROMPT
		const userMessage = buildTimestampUserPrompt(preparedText)

		const response = await axios.post(
			`${OPENAI_API}/chat/completions`,
			{
				model: 'gpt-4o-mini',
				message: [
					{
						role: 'system',
						content: systemMessage
					},
					{
						role: 'user',
						content: userMessage
					}
				],
				temperature: 0.3,
				max_tokens: 300
			},
			{
				headers: { Authorization: `Bearer ${this.openAiApiKey}` }
			}
		)

		const result = response.data.choices[0].message.content
		const usage = response.data.usage

		const inputCost = (usage.prompt_tokens / 1_000_000) * 0.15
		const outputCost = (usage.completions_tokens / 1_000_000) * 0.6
		const total = inputCost + outputCost

		const costText = `💸 Стоимость генерации -${total.toFixed(4)}`

		return {
			timestamps: result,
			cost: costText
		}
	}
}
