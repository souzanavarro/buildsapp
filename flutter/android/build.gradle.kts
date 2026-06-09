
allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}

subprojects {
    project.evaluationDependsOn(":app")
}

subprojects {
    afterEvaluate {
        if (project.extensions.findByName("android") != null) {
            val android = project.extensions.getByName("android") as com.android.build.gradle.BaseExtension
            if (android.namespace == null) {
                if (project.name == "background_locator_2") {
                    android.namespace = "yukams.app.background_locator_2"
                } else {
                    try {
                        val manifestFile = project.file("src/main/AndroidManifest.xml")
                        if (manifestFile.exists()) {
                            val contents = manifestFile.readText()
                            val match = Regex("package=\"([^\"]+)\"").find(contents)
                            if (match != null) {
                                android.namespace = match.groupValues[1]
                            }
                        }
                    } catch (e: Exception) {
                        println("Failed to auto-set namespace for ${project.name}: ${e.message}")
                    }
                }
            }
        }
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
