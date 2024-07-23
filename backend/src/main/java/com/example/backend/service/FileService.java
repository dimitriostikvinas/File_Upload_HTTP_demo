package com.example.backend.service;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class FileService {
   private static final String UPLOAD_DIR = "uploads/";

   public void uploadChunk(MultipartFile file, int chunkNumber, int totalChunks) throws IOException {
      Path uploadDirPath = Paths.get(UPLOAD_DIR);
      if (Files.notExists(uploadDirPath)) {
         try {
            Files.createDirectories(uploadDirPath);
            System.out.println("Created upload directory: " + UPLOAD_DIR);
         } catch (IOException e) {
            System.out.println("Failed to create upload directory: " + e.getMessage());
            throw new IOException("Failed to create upload directory", e);
         }
      }

      File uploadFile = new File(UPLOAD_DIR + file.getOriginalFilename());
      try (RandomAccessFile raf = new RandomAccessFile(uploadFile, "rw")) {
         long offset = (long) chunkNumber * (1024 * 1024);
         raf.seek(offset);
         raf.write(file.getBytes());
         System.out.println("Chunk " + chunkNumber + " of " + totalChunks + " uploaded successfully");
      } catch (IOException e) {
         System.out.println("Error writing chunk " + chunkNumber + " of " + totalChunks + " for file "
               + file.getOriginalFilename() + ": " + e.getMessage());
         throw new IOException("Error writing file chunk", e);
      }
   }

   public List<String> listUploadedFiles() {
      try {
         return Files.list(Paths.get(UPLOAD_DIR))
               .map(Path::getFileName)
               .map(Path::toString)
               .collect(Collectors.toList());
      } catch (IOException e) {
         throw new RuntimeException("Failed to list uploaded files", e);
      }
   }
}
