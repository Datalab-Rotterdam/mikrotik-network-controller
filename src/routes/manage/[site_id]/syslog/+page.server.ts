export async function load({ parent }) {
    const { site } = await parent();
    return { site };
}
