import catalog from '../../../../static/mikrotik_products_catalog.json';

type MikroTikProduct = {
	product_code: string;
	name: string;
	thumbnail?: string;
	downloaded_images?: string[];
};

const faviconFallback = {
	id: 'mikrotik-favicon',
	label: 'MikroTik device',
	src: '/favicon.svg'
};

function normalizeModel(value: string | undefined) {
	return (value ?? '')
		.toLowerCase()
		.replace(/\+/g, 'plus')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

function productThumbnail(product: MikroTikProduct) {
	return product.downloaded_images?.[0] ?? product.thumbnail;
}

const products = (catalog.products ?? []) as MikroTikProduct[];

const productImageIndex = new Map(
	products.flatMap((product) => {
		const src = productThumbnail(product);

		if (!src) {
			return [];
		}

		return [
			[normalizeModel(product.product_code), { id: product.product_code, label: product.name, src }],
			[normalizeModel(product.name), { id: product.product_code, label: product.name, src }]
		] as const;
	})
);

export function resolveDeviceImage(model: string | undefined, _type: string) {
	const productImage = productImageIndex.get(normalizeModel(model));

	if (productImage) {
		return productImage;
	}

	return faviconFallback;
}
