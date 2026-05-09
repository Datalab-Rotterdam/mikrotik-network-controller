import { countUsers } from '$lib/server/repositories/user.repository';

export async function hasAnyUsers(): Promise<boolean> {
	return (await countUsers()) > 0;
}
