package utils

import (
	"fmt"
	"io"
	"os"
	"strings"
)

func CopyFile(srcPath, destPath string) error {
	inputFile, err := os.Open(srcPath)
	if err != nil {
		return fmt.Errorf("couldn't open source file: %v", err)
	}
	defer inputFile.Close()

	outputFile, err := os.Create(destPath)
	if err != nil {
		return fmt.Errorf("couldn't open dest file: %v", err)
	}
	defer outputFile.Close()

	_, err = io.Copy(outputFile, inputFile)
	if err != nil {
		return fmt.Errorf("couldn't copy to dest from source: %v", err)
	}

	inputFile.Close()
	return nil
}

func DeleteFile(path string) error {
	err := os.Remove(path)
	if err != nil {
		return err
	}
	return nil
}

func SanitizeFileLink(path string) string {
	result := strings.Replace(path, " ", "_", -1)
	result = strings.TrimSpace(result)
	return result
}
