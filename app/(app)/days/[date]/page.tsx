export default async function DaysPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  return <main className="p-5"><h1 className="serif text-2xl">Days · {date}</h1></main>;
}
