package com.example.backend.controller;

import com.example.backend.service.FileService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpRange;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
@CrossOrigin(origins = "http://localhost:4200")
public class FileController {

   private final FileService fileService;

   public FileController(FileService fileService) {
      this.fileService = fileService;
   }

   @PostMapping("/upload-chunk")
   public ResponseEntity<Map<String, Object>> uploadChunk(
         @RequestParam("file") MultipartFile file,
         @RequestParam("chunkNumber") int chunkNumber,
         @RequestParam("totalChunks") int totalChunks) {
      Map<String, Object> response = new HashMap<>();
      try {
         fileService.uploadChunk(file, chunkNumber, totalChunks);
         response.put("status", "success");
         response.put("chunkNumber", chunkNumber);
         response.put("message", "Chunk uploaded successfully");
         return ResponseEntity.ok(response);
      } catch (IOException e) {
         System.out.println("Error processing file chunk: " + e.getMessage());
         response.put("status", "error");
         response.put("chunkNumber", chunkNumber);
         response.put("message", "Error processing file chunk: " + e.getMessage());
         return ResponseEntity.status(500).body(response);
      } catch (Exception e) {
         System.out.println("Unexpected error: " + e.getMessage());
         response.put("status", "error");
         response.put("chunkNumber", chunkNumber);
         response.put("message", "Unexpected error: " + e.getMessage());
         return ResponseEntity.status(500).body(response);
      }
   }

   @GetMapping("/list-uploaded-files")
   public ResponseEntity<List<String>> listUploadedFiles() {
      try {
         List<String> files = fileService.listUploadedFiles();
         return ResponseEntity.ok(files);
      } catch (RuntimeException e) {
         return ResponseEntity.status(500).body(null);
      }
   }
}
