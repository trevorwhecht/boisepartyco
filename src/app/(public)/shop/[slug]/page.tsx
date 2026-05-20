export default async function ShopItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <main className="p-16 text-center"><h1 className="serif text-4xl">Item: {slug} — G4 coming soon</h1></main>
}
