const express = require("express");
const router = express.Router();
const Book = require("../models/book");
const Author = require("../models/author");
const fs = require("fs");
const path = require("path");
const uploadPath = path.join("public", Book.coverImageBasePath);
const imageMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
const multer = require("multer");
const upload = multer({
  dest: uploadPath,
  fileFilter: (req, file, callback) => {
    callback(null, imageMimeTypes.includes(file.mimetype));
  },
});

// All books route
router.get("/", async (req, res) => {
  let query = Book.find();
  if (req.query.title != null && req.query.name !== "") {
    query = query.regex("title", new RegExp(req.query.title, "i"));
  }
  if (req.query.publishedBefore != null && req.query.publishedBefore !== "") {
    query = query.lte("publishDate", req.query.publishedBefore);
  }
  if (req.query.publishedAfter != null && req.query.publishedAfter !== "") {
    query = query.gte("publishDate", req.query.publishedAfter);
  }
  try {
    const books = await query.exec();
    res.render("books/all", {
      books: books,
      searchOptions: req.query,
    });
  } catch (error) {
    res.redirect("/");
  }
});

// New book route
router.get("/new", async (req, res) => {
  renderNewPage(res, new Book());
});

// Create book route
router.post("/", upload.single("cover"), async (req, res) => {
  const fileName = req.file != null ? req.file.filename : null;
  const book = new Book({
    title: req.body.title,
    author: req.body.author,
    publishDate: new Date(req.body.publishDate),
    pageCount: req.body.pageCount,
    coverImageName: fileName,
    description: req.body.description,
  });

  try {
    const newBook = await book.save();
    res.redirect(`books/${newBook.id}`);
  } catch (error) {
    if (book.coverImageName != null) {
      removeBookCover(book.coverImageName);
    }
    renderNewPage(res, book, true);
  }
});

// Show book route
router.get("/:id", async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).populate("author").exec();
    res.render("books/show", { book: book });
  } catch (error) {
    res.redirect("/");
  }
});

// Edit book route
router.get("/:id/edit", async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    renderEditPage(res, book);
  } catch (error) {
    res.redirect("/");
  }
});

// Update book route
router.put("/:id", upload.single("cover"), async (req, res) => {
  const fileName = req.file != null ? req.file.filename : null;

  let book;
  try {
    book = await Book.findById(req.params.id);
    (book.title = req.body.title),
      (book.author = req.body.author),
      (book.publishDate = new Date(req.body.publishDate)),
      (book.pageCount = req.body.pageCount),
      (book.coverImageName = fileName),
      (book.description = req.body.description),
      await book.save();
    res.redirect(`${book.id}`);
  } catch (error) {
    if (book.coverImageName != null) {
      removeBookCover(book.coverImageName);
    }
    if (book != null) {
      renderEditPage(res, book, true);
    } else {
      res.redirect("/");
    }
  }
});

// Delete book route
router.delete("/:id", async (req, res) => {
  let book;
  try {
    book = await Book.findByIdAndRemove(req.params.id);
    res.redirect("/books");
  } catch (error) {
    if (book != null) {
      res.render("books/show", {
        book: book,
        errorMessage: "Could not remove book",
      });
    } else {
      res.redirect("/");
    }
  }
});

function removeBookCover(fileName) {
  fs.unlink(path.join(uploadPath, fileName), (error) => {
    if (error) console.error(error);
  });
}

async function renderNewPage(res, book, hasError = false) {
  renderFormPage(res, book, "new", (hasError = false));
}

async function renderEditPage(res, book, hasError = false) {
  renderFormPage(res, book, "edit", (hasError = false));
}

async function renderFormPage(res, book, form, hasError = false) {
  try {
    const authors = await Author.find({});
    const params = {
      authors: authors,
      book: book,
    };
    if (hasError) {
      if (form === "edit") {
        params.errorMessage = "Error updating book";
      } else {
        params.errorMessage = "Error creating book";
      }
    }
    res.render(`books/${form}`, params);
  } catch (error) {
    res.redirect("/books");
  }
}

module.exports = router;
