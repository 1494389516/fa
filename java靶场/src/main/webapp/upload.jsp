<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
<head>
    <title>文件上传</title>
</head>
<body>
    <h2>文件上传</h2>
    <form action="upload" method="post" enctype="multipart/form-data">
        <input type="file" name="file" required>
        <button type="submit">上传文件</button>
    </form>
</body>
</html>
