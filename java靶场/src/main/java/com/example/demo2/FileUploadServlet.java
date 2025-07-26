package com.example.demo2;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.MultipartConfig;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.Part;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.logging.Level;
import java.util.logging.Logger;

@WebServlet("/upload")
@MultipartConfig(
    fileSizeThreshold = 1024 * 1024,  // 1MB
    maxFileSize = 1024 * 1024 * 20,   // 20MB
    maxRequestSize = 1024 * 1024 * 100 // 100MB
)
public class FileUploadServlet extends HttpServlet {
    private static final Logger LOGGER = Logger.getLogger(FileUploadServlet.class.getName());
    private static final String UPLOAD_DIR = "webapp";

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        // 确保上传目录存在
        String uploadPath = getServletContext().getRealPath("") + File.separator + UPLOAD_DIR;
        File uploadDir = new File(uploadPath);
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }

        try {
            // 处理每个上传的文件
            for (Part part : request.getParts()) {
                String fileName = extractFileName(part);
                if (fileName != null && !fileName.isEmpty()) {
                    // 保存文件
                    File file = new File(uploadDir, fileName);
                    try (InputStream input = part.getInputStream()) {
                        Files.copy(input, file.toPath(), StandardCopyOption.REPLACE_EXISTING);
                    }
                    LOGGER.log(Level.INFO, "文件上传成功: {0}", file.getAbsolutePath());
                }
            }
            request.setAttribute("message", "文件上传成功!");
        } catch (Exception ex) {
            LOGGER.log(Level.SEVERE, "文件上传失败", ex);
            request.setAttribute("message", "文件上传失败: " + ex.getMessage());
        }

        // 返回上传页面
        request.getRequestDispatcher("/upload.jsp").forward(request, response);
    }

    // 从Part中提取文件名
    private String extractFileName(Part part) {
        String contentDisp = part.getHeader("content-disposition");
        String[] items = contentDisp.split(";");
        for (String item : items) {
            if (item.trim().startsWith("filename")) {
                return item.substring(item.indexOf("=") + 2, item.length() - 1);
            }
        }
        return null;
    }
}
