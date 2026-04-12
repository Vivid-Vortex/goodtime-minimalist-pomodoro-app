// Package sync implements Firestore cloud sync for the Goodtime desktop app.
//
// Authentication: drop a Firebase service-account JSON file at
//   {UserConfigDir}/GoodtimePomodoro/service-account.json
// Download it from Firebase Console → Project Settings → Service Accounts.
package sync

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

const (
	firestoreScope   = "https://www.googleapis.com/auth/datastore"
	firestoreBaseURL = "https://firestore.googleapis.com/v1"
	ProjectID        = "timesheetkotlin"
)

// HTTPDoer abstracts *http.Client so tests can inject a mock transport.
type HTTPDoer interface {
	Do(req *http.Request) (*http.Response, error)
}

// Client is a thin Firestore REST client.
type Client struct {
	httpClient HTTPDoer
	projectID  string
	baseURL    string
}

// NewClientFromJSON creates an authenticated Client from a service-account JSON blob.
func NewClientFromJSON(ctx context.Context, credJSON []byte) (*Client, error) {
	creds, err := google.CredentialsFromJSON(ctx, credJSON, firestoreScope)
	if err != nil {
		return nil, fmt.Errorf("parse service-account credentials: %w", err)
	}
	hc := oauth2.NewClient(ctx, creds.TokenSource)
	hc.Timeout = 15 * time.Second
	return &Client{httpClient: hc, projectID: ProjectID, baseURL: firestoreBaseURL}, nil
}

// newTestClient builds a Client for unit tests, bypassing auth.
func newTestClient(doer HTTPDoer, projectID, baseURL string) *Client {
	return &Client{httpClient: doer, projectID: projectID, baseURL: baseURL}
}

// docURL returns the full REST URL for a document.
func (c *Client) docURL(collection, docID string) string {
	return fmt.Sprintf("%s/projects/%s/databases/(default)/documents/%s/%s",
		c.baseURL, c.projectID, collection, docID)
}

// GetDocument fetches a document and returns it as a plain Go map.
// Returns (nil, nil) when the document does not exist (HTTP 404).
func (c *Client) GetDocument(ctx context.Context, collection, docID string) (map[string]interface{}, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.docURL(collection, docID), nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, nil
	}
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Firestore GET %s/%s: HTTP %d — %s", collection, docID, resp.StatusCode, body)
	}
	var fsDoc firestoreDocument
	if err := json.NewDecoder(resp.Body).Decode(&fsDoc); err != nil {
		return nil, fmt.Errorf("decode GET response: %w", err)
	}
	return firestoreFieldsToMap(fsDoc.Fields), nil
}

// SetDocument creates or fully replaces a document via PATCH (updateMask omitted).
func (c *Client) SetDocument(ctx context.Context, collection, docID string, data map[string]interface{}) error {
	fsDoc := firestoreDocument{Fields: mapToFirestoreFields(data)}
	body, err := json.Marshal(fsDoc)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPatch, c.docURL(collection, docID), bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("Firestore PATCH %s/%s: HTTP %d — %s", collection, docID, resp.StatusCode, b)
	}
	return nil
}

// ─── Firestore wire-format types ─────────────────────────────────────────────

type firestoreDocument struct {
	Fields map[string]firestoreValue `json:"fields,omitempty"`
}

type firestoreValue struct {
	StringValue  *string              `json:"stringValue,omitempty"`
	IntegerValue *string              `json:"integerValue,omitempty"` // Firestore sends int64 as string
	BooleanValue *bool                `json:"booleanValue,omitempty"`
	DoubleValue  *float64             `json:"doubleValue,omitempty"`
	MapValue     *struct {
		Fields map[string]firestoreValue `json:"fields,omitempty"`
	} `json:"mapValue,omitempty"`
	ArrayValue *struct {
		Values []firestoreValue `json:"values,omitempty"`
	} `json:"arrayValue,omitempty"`
	NullValue *string `json:"nullValue,omitempty"`
}

// mapToFirestoreFields converts map[string]interface{} → Firestore field map.
func mapToFirestoreFields(m map[string]interface{}) map[string]firestoreValue {
	out := make(map[string]firestoreValue, len(m))
	for k, v := range m {
		out[k] = toFSValue(v)
	}
	return out
}

func toFSValue(v interface{}) firestoreValue {
	if v == nil {
		n := "NULL_VALUE"
		return firestoreValue{NullValue: &n}
	}
	switch val := v.(type) {
	case bool:
		return firestoreValue{BooleanValue: &val}
	case int:
		s := fmt.Sprintf("%d", val)
		return firestoreValue{IntegerValue: &s}
	case int64:
		s := fmt.Sprintf("%d", val)
		return firestoreValue{IntegerValue: &s}
	case float64:
		// JSON numbers unmarshal as float64; store as integer if whole
		if val == float64(int64(val)) {
			s := fmt.Sprintf("%d", int64(val))
			return firestoreValue{IntegerValue: &s}
		}
		return firestoreValue{DoubleValue: &val}
	case string:
		return firestoreValue{StringValue: &val}
	case map[string]interface{}:
		mv := &struct {
			Fields map[string]firestoreValue `json:"fields,omitempty"`
		}{Fields: mapToFirestoreFields(val)}
		return firestoreValue{MapValue: mv}
	case []interface{}:
		items := make([]firestoreValue, len(val))
		for i, item := range val {
			items[i] = toFSValue(item)
		}
		av := &struct {
			Values []firestoreValue `json:"values,omitempty"`
		}{Values: items}
		return firestoreValue{ArrayValue: av}
	default:
		s := fmt.Sprintf("%v", val)
		return firestoreValue{StringValue: &s}
	}
}

// firestoreFieldsToMap converts Firestore fields → map[string]interface{}.
func firestoreFieldsToMap(fields map[string]firestoreValue) map[string]interface{} {
	out := make(map[string]interface{}, len(fields))
	for k, v := range fields {
		out[k] = fromFSValue(v)
	}
	return out
}

func fromFSValue(v firestoreValue) interface{} {
	switch {
	case v.BooleanValue != nil:
		return *v.BooleanValue
	case v.IntegerValue != nil:
		var i int64
		fmt.Sscanf(*v.IntegerValue, "%d", &i)
		return i
	case v.DoubleValue != nil:
		return *v.DoubleValue
	case v.StringValue != nil:
		return *v.StringValue
	case v.MapValue != nil:
		return firestoreFieldsToMap(v.MapValue.Fields)
	case v.ArrayValue != nil:
		items := make([]interface{}, len(v.ArrayValue.Values))
		for i, item := range v.ArrayValue.Values {
			items[i] = fromFSValue(item)
		}
		return items
	default:
		return nil
	}
}
