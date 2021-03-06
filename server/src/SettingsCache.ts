import { TextDocument, WorkspaceFolder } from 'vscode-languageserver';

export interface IEnvironment {
	[key: string]: string;
}

export type RubyCommandConfiguration = {
	command?: string;
	useBundler?: boolean;
};

export type RuboCopLintConfiguration = RubyCommandConfiguration & {
	lint?: boolean;
	only?: string[];
	except?: string[];
	require?: string[];
	rails?: boolean;
	forceExclusion?: boolean;
};

export interface RubyConfiguration {
	useBundler: boolean;
	workspaceFolderUri: string;
	interpreter?: {
		commandPath?: string;
	};
	pathToBundler: string;
	lint: {
		fasterer?: boolean | RubyConfiguration;
		reek?: boolean | RubyConfiguration;
		rubocop?: boolean | RuboCopLintConfiguration;
	};
	format: boolean | 'rubocop' | 'standard' | 'rufo';
}

class SettingsCache<P extends WorkspaceFolder | TextDocument, T> {
	private cache: Map<string, T>;
	public fetcher: (target: string[]) => Promise<T[]>;

	constructor() {
		this.cache = new Map();
	}

	public set(target: P | string, env: T): void {
		const key = typeof target === 'string' ? target : target.uri;
		this.cache.set(key, env);
	}

	public setAll(targets: { [key: string]: T }): void {
		for (const target of Object.keys(targets)) {
			this.set(target, targets[target]);
		}
	}

	public delete(target: P): boolean {
		return this.cache.delete(target.uri);
	}

	public deleteAll(targets: P[]): void {
		for (const target of targets) {
			this.delete(target);
		}
	}

	public async get(target: P | string): Promise<T | undefined> {
		if (!target) return undefined;
		const key = typeof target === 'string' ? target : target.uri;
		let settings: T = this.cache.get(key);
		if (!settings) {
			const result = await this.fetcher([key]);
			settings = result.length > 0 ? result[0] : undefined;

			if (settings) {
				this.set(key, settings);
			}
		}

		return settings;
	}

	public async getAll(targets: P[]): Promise<{ [key: string]: T }> {
		const settings: { [key: string]: T } = {};

		for (const target of targets) {
			settings[target.uri] = await this.get(target);
		}

		return settings;
	}

	public flush(): void {
		this.cache.clear();
	}

	public toString(): string {
		return this.cache.toString();
	}
}

export const documentConfigurationCache = new SettingsCache<TextDocument, RubyConfiguration>();
export const workspaceRubyEnvironmentCache = new SettingsCache<WorkspaceFolder, IEnvironment>();
