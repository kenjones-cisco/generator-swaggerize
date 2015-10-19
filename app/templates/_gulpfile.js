var gulp = require('gulp');
var istanbul = require('gulp-istanbul');
var jasmine = require('gulp-jasmine');
var jshint = require('gulp-jshint');

gulp.task('pre-test', function () {
  return gulp.src(['handlers/*.js', 'models/*.js', 'server.js'])
    // Covering files
    .pipe(istanbul())
    // Force `require` to return covered files
    .pipe(istanbul.hookRequire());
});

gulp.task('test', ['pre-test'], function () {
  return gulp.src(['tests/test*.js'])
    .pipe(jasmine())
    // Creating the reports after tests ran
    .pipe(istanbul.writeReports());
});

gulp.task('cover', ['pre-test'], function () {
  return gulp.src(['tests/test*.js'])
    .pipe(jasmine())
    // Creating the reports after tests ran
    .pipe(istanbul.writeReports({reporters: ['html']}));
});

gulp.task('lint', function() {
  return gulp.src(['handlers/*.js', 'models/*.js', 'server.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});
