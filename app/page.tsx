import { redirect } from 'next/navigation'

type SearchParams = {
  [key: string]: string | string[] | undefined
}

export default async function HomeRedirect({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const params = (searchParams ? await searchParams : {}) ?? {}
  const urlParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      urlParams.append(key, value)
    } else if (Array.isArray(value)) {
      value.forEach((v) => urlParams.append(key, v))
    }
  }

  const queryString = urlParams.toString()
  const target = queryString ? `/login?${queryString}` : '/login'

  redirect(target)
}
