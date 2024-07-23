import { Component, OnInit } from '@angular/core';
import { FileUploadService } from './file-upload.service';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  uploadedFiles: File[] = [];
  uploadedFilesList: string[] = [];
  totalSize: number = 0;
  totalSizePercent: number = 0;
  fileUploaded: boolean = false;
  maxFileSize: number = 0; // Dynamic based on actual file size
  uploadSubscriptions: Subscription[] = []; // To track upload subscriptions
  eta: string = ''; // Estimated time remaining

  constructor(
    private fileUploadService: FileUploadService,
    private messageService: MessageService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.refreshUploadedFiles();
  }

  onFileSelect(event: any) {
    const files = event.files;
    this.totalSize = 0;
    this.uploadedFiles = [];

    for (let file of files) {
      if (file.type !== 'text/csv') {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Only CSV files are allowed.',
        });
        return;
      }
      this.uploadedFiles.push(file);
      this.totalSize += file.size;
    }

    this.maxFileSize = this.totalSize; // Set maxFileSize to the total size of selected files
    this.totalSizePercent = 0; // Reset the progress bar
    this.cd.detectChanges(); // Trigger change detection
  }

  onClearFiles() {
    this.uploadedFiles = [];
    this.totalSize = 0;
    this.totalSizePercent = 0;
    this.fileUploaded = false;
    this.eta = ''; // Reset ETA
    this.uploadSubscriptions.forEach((sub) => sub.unsubscribe()); // Cancel all uploads
    this.uploadSubscriptions = []; // Clear subscriptions
    this.cd.detectChanges(); // Trigger change detection
  }

  formatSize(bytes: number) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024,
      dm = 2,
      sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'],
      i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  async uploadFiles() {
    const chunkSize = 1024 * 1024; // 1MB
    for (let file of this.uploadedFiles) {
      let chunkNumber = 0;
      const totalChunks = Math.ceil(file.size / chunkSize);
      let totalUploadedSize = 0; // Initialize total uploaded size
      let startTime = Date.now(); // Initialize start time

      for (let start = 0; start < file.size; start += chunkSize) {
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        let success = false;
        let retries = 0;
        const maxRetries = 3;

        while (!success && retries < maxRetries) {
          try {
            await this.uploadChunk(file, chunk, ++chunkNumber, totalChunks);
            success = true;

            totalUploadedSize += chunk.size; // Update total uploaded size

            let elapsedTime = (Date.now() - startTime) / 1000; // in seconds
            let remainingTime =
              ((file.size - totalUploadedSize) / totalUploadedSize) *
              elapsedTime;

            // Update progress and ETA
            this.totalSizePercent = Math.round(
              (totalUploadedSize / file.size) * 100
            );
            this.eta = this.formatTime(remainingTime);
            this.cd.detectChanges(); // Trigger change detection
          } catch (error) {
            retries++;
            console.error('Retrying chunk upload', error);
          }
        }

        if (!success) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to upload chunk after multiple attempts.',
          });
          return; // Exit if a chunk fails to upload after retries
        }
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'File uploaded successfully.',
      });
      this.uploadedFilesList.push(file.name); // Add file to uploaded files list

      // Remove the file from the uploaded files list and update the UI
      this.uploadedFiles = this.uploadedFiles.filter((f) => f !== file);
      this.totalSize = this.uploadedFiles.reduce((acc, f) => acc + f.size, 0); // Recalculate total size
      this.totalSizePercent = 0; // Reset the progress bar
      this.fileUploaded = false; // Reset the file upload status
      this.eta = ''; // Reset ETA after upload
      this.cd.detectChanges(); // Trigger change detection

      // Refresh the uploaded files list
      this.refreshUploadedFiles();
    }
    this.onClearFiles();
  }

  uploadChunk(
    file: File,
    chunk: Blob,
    chunkNumber: number,
    totalChunks: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const uploadSub = this.fileUploadService
        .uploadFileChunk(file, chunk, chunkNumber)
        .subscribe(
          (event) => {
            if (event.type === HttpEventType.UploadProgress) {
              const progress = Math.round((100 * event.loaded) / event.total);
              console.log(
                `Chunk ${chunkNumber} of ${totalChunks} is ${progress}% uploaded.`
              );
            } else if (event instanceof HttpResponse) {
              if (event.body.status === 'success') {
                console.log(
                  `Chunk ${chunkNumber} of ${totalChunks} has been uploaded successfully.`
                );
                resolve();
              } else {
                reject(`Failed to upload chunk ${chunkNumber}`);
              }
            }
          },
          (error) => {
            console.error('Error uploading chunk', error);
            reject(error);
          }
        );

      this.uploadSubscriptions.push(uploadSub); // Track the subscription
    });
  }

  refreshUploadedFiles() {
    this.fileUploadService.getUploadedFiles().subscribe((files) => {
      this.uploadedFilesList = files;
      this.cd.detectChanges(); // Trigger change detection
    });
  }

  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${hours}h ${minutes}m ${secs}s`;
  }

  clearFiles() {
    this.onClearFiles();
  }
}
