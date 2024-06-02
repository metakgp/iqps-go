import { Component } from "solid-js";
import { FileCard } from "../components/FileCard";
import {
    AiOutlineFilePdf as PDFIcon,
    AiOutlineDelete as CloseIcon,
} from "solid-icons/ai";
import { IQuestionPaperFile } from "../types/types";


export const AdminDash: Component = () => {
	return (
		<div class="admin-dash">
            <div class="title">
                <h1>IQPS - Admin Dashboard</h1>
                <p>
                    <i># list of pdfs #</i>
                </p>
            </div>
		</div>
	)
}