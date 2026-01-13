import type Phaser from 'phaser'

let gameInstance: Phaser.Game | null = null

export function setGameInstance(game: Phaser.Game | null) {
	gameInstance = game
}

export function getGameInstance() {
	return gameInstance
}

