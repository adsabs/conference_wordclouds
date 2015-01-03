module.exports = function(grunt) {

  /*
      just need to combine and compress javascript
      and compile and minify less
  */

  grunt.initConfig({

            pkg: grunt.file.readJSON('package.json'),

            uglify: {

            my_target: {
              options :{
                beautify : true
              },
                files: {
                    'compiled_scripts.min.js': [
                        // 'bower_components/underscore/underscore.js',
                        // 'bower_components/d3/d3.js',
                        // 'bower_components/jquery/jquery.js',
                        'bower_components/d3-cloud/d3.layout.cloud.js',
                        'cloud_configuration.js',
                        'create_cloud.js'
                    ]
                }
            }
        },

        // Compile LESS to CSS
        less: {

        options: {

      },
            site: {
                src: ['wordcloud.less'],
                dest: 'wordcloud.css'
            }

        },


  });

  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('default', ['less', 'uglify']);

};