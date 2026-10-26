package com.smartmessenger.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import java.util.UUID;

@Service
public class AvatarStorageService {
    private final Path folder;

    public AvatarStorageService(@Value("${app.upload-dir:uploads}") String uploadDir) {
        folder = Path.of(uploadDir).toAbsolutePath().normalize().resolve("avatars");
    }

    public String store(MultipartFile file) throws IOException {
        if (file.isEmpty() || file.getSize() > 20L * 1024 * 1024)
            throw invalidImage();
        BufferedImage source;
        // Inspect the actual image, not its filename or client-supplied MIME type.
        try (var raw = file.getInputStream(); var input = ImageIO.createImageInputStream(raw)) {
            if (input == null) throw invalidImage();
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw invalidImage();
            var reader = readers.next();
            try {
                if (!Set.of("png", "jpeg", "jpg").contains(reader.getFormatName().toLowerCase(java.util.Locale.ROOT)))
                    throw invalidImage();
                reader.setInput(input);
                int width = reader.getWidth(0), height = reader.getHeight(0);
                if (width <= 0 || height <= 0 || (long) width * height > 20_000_000) throw invalidImage();
                source = reader.read(0);
                if (source == null) throw invalidImage();
            } finally { reader.dispose(); }
        } catch (IOException e) { throw invalidImage(); }
        // Store a square thumbnail and strip original metadata.
        BufferedImage avatar = new BufferedImage(512, 512, BufferedImage.TYPE_INT_ARGB);
        var graphics = avatar.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            int side = Math.min(source.getWidth(), source.getHeight());
            int x = (source.getWidth() - side) / 2, y = (source.getHeight() - side) / 2;
            graphics.drawImage(source, 0, 0, 512, 512, x, y, x + side, y + side, null);
        } finally { graphics.dispose(); }
        Files.createDirectories(folder);
        String id = UUID.randomUUID() + ".png";
        Path destination = folder.resolve(id);
        try {
            if (!ImageIO.write(avatar, "png", destination.toFile())) throw new IOException("Cannot encode avatar");
        } catch (IOException e) { Files.deleteIfExists(destination); throw e; }
        return id;
    }

    public Path resolve(String id) {
        if (!id.matches("[0-9a-f-]{36}\\.png")) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        Path path = folder.resolve(id);
        if (!Files.isRegularFile(path)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return path;
    }

    private ResponseStatusException invalidImage() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Chọn ảnh PNG hoặc JPEG, tối đa 20 MB và 20 triệu điểm ảnh");
    }
}
