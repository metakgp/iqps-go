import { toast } from 'solid-toast';

export async function copyLink(e: Event, link: string) {
	e.preventDefault();

    try {
      await navigator.clipboard.writeText(link);
      toast('Link copied to clipboard.');
    } catch (e) {
      toast('Error copying link to the clipboard.', {
        className: "toast toast-err"
      });
    }
}