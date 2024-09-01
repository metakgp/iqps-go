package main

var respData struct {
	Token string `json:"token"`
}

type QuestionPaper struct {
	ID              int    `json:"id"`
	CourseCode      string `json:"course_code"`
	CourseName      string `json:"course_name"`
	Year            int    `json:"year"`
	Exam            string `json:"exam"`
	FileLink        string `json:"filelink"`
	FromLibrary     bool   `json:"from_library"`
	UploadTimestamp string `json:"upload_timestamp,omitempty"`
	ApproveStatus   bool   `json:"approve_status,omitempty"`
	CourseDetails   string `json:"course_details,omitempty"`
}

type uploadEndpointRes struct {
	Filename    string `json:"filename"`
	Status      string `json:"status"`
	Description string `json:"description"`
}

type GhOAuthReqBody struct {
	GhCode string `json:"code"`
}

type GithubAccessTokenResponse struct {
	AccessToken string `json:"access_token"`
	Scope       string `json:"scope"`
	TokenType   string `json:"token_type"`
}

type GithubUserResponse struct {
	Login string `json:"login"`
	ID    int    `json:"id"`
}
