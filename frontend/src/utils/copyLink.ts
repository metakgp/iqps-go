import { toast } from 'solid-toast';

export async function copyLink(e: Event, link: string) {
	e.preventDefault();

  return toast.promise(navigator.clipboard.writeText(link), {
    loading: "Copying link to clipboard...",
    success: "Link copied to clipboard.",
    error: "Failed to copy link to clipboard."
  })
}