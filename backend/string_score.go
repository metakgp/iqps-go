// Credits: http://joshaven.com/string_score/

package main

import (
	"strings"
)

func StringScore(prim string, sec string, fuzz float64) float64 {
	if prim == sec {
		return 1
	}
	if sec == "" {
		return 0
	}
	score := 0.0
	a := 0
	g := strings.ToLower(prim)
	n := len(prim)
	h := strings.ToLower(sec)
	k := len(sec)
	var b int
	l := 1.0

	if fuzz > 0 {
		for i := 0; i < k; i++ {
			b = strings.Index(g[a:], string(h[i]))
			if b == -1 {
				l += 1 - fuzz
			} else {
				b += a
				if a == b {
					a = 7
				} else {
					a = 1
					if prim[b-1] == ' ' {
						a += 8
					}
				}
				if prim[b] == sec[i] {
					a += 1
				}
				score += float64(a) / 10
				a = b + 1
			}
		}
	} else {
		for i := 0; i < k; i++ {
			b = strings.Index(g[a:], string(h[i]))
			if b == -1 {
				return 0
			}
			b += a
			if a == b {
				a = 7
			} else {
				a = 1
				if prim[b-1] == ' ' {
					a += 8
				}
			}
			if prim[b] == sec[i] {
				a += 1
			}
			score += float64(a) / 10
			a = b + 1
		}
	}
	score = (0.5 * (score/float64(n) + score/float64(k))) / l
	if h[0] == g[0] && score < 0.85 {
		score += 0.15
	}
	return score
}
