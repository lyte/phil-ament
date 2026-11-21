declare global {
	namespace App {
		interface Locals {
			authRequired: boolean;
			user: { authenticated: true } | null;
		}
	}
}

export {};
