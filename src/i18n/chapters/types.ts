/** Глава сказки: id (общий для всех языков, по нему — кадр сцены) и текст. */
export interface Chapter {
	id: string;
	title: string;
	paragraphs: string[];
}
