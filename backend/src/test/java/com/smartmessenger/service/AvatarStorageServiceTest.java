package com.smartmessenger.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Path;
import static org.junit.jupiter.api.Assertions.*;

class AvatarStorageServiceTest {
    @TempDir Path directory;

    @Test
    void rejectsExecutableContentDisguisedAsImage() {
        var service = new AvatarStorageService(directory.toString());
        var fake = new MockMultipartFile("file", "photo.png", "image/png", "<script>alert(1)</script>".getBytes());
        assertThrows(ResponseStatusException.class, () -> service.store(fake));
    }

    @Test
    void storesRealLocalImageAsSquareThumbnail() throws Exception {
        var buffer = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(640, 480, BufferedImage.TYPE_INT_RGB), "jpeg", buffer);
        var service = new AvatarStorageService(directory.toString());
        String id = service.store(new MockMultipartFile("file", "../avatar.jpg", "image/jpeg", buffer.toByteArray()));
        assertTrue(id.matches("[0-9a-f-]{36}\\.png"));
        var result = ImageIO.read(service.resolve(id).toFile());
        assertEquals(512, result.getWidth()); assertEquals(512, result.getHeight());
        assertThrows(ResponseStatusException.class, () -> service.resolve("../avatar.png"));
    }
}
