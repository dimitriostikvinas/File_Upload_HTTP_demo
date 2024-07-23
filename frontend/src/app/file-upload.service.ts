import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FileUploadService {
  private baseUrl = 'http://localhost:8080/api/files';

  constructor(private http: HttpClient) {}

  uploadFileChunk(
    file: File,
    chunk: Blob,
    chunkNumber: number
  ): Observable<any> {
    const formData: FormData = new FormData();
    formData.append('file', chunk, file.name);
    formData.append('chunkNumber', chunkNumber.toString());
    formData.append(
      'totalChunks',
      Math.ceil(file.size / (1024 * 1024)).toString()
    );

    return this.http.post(`${this.baseUrl}/upload-chunk`, formData, {
      reportProgress: true,
      observe: 'events',
    });
  }

  getUploadedFiles(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/list-uploaded-files`);
  }
}
