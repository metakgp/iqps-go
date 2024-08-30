import { MouseEvent } from 'react';
import { toast } from 'react-hot-toast';

export function copyLink(e: MouseEvent, link: string) {
	e.preventDefault();

  toast.promise(navigator.clipboard.writeText(link), {
    loading: "Copying link to clipboard...",
    success: "Link copied to clipboard.",
    error: "Failed to copy link to clipboard."
  })
}